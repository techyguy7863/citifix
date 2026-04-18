const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get all users
router.get("/users", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        rewardPoints: true,
        createdAt: true,
        _count: { select: { complaints: true, assignedComplaints: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch("/users/:id/role", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = parseInt(req.params.id, 10);

    if (!["CITIZEN", "ADMIN", "SUPERADMIN", "SUBADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, role: true, phone: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign sub-admin to a complaint
router.post("/complaints/:id/assign", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { subAdminId } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    const subAdmin = await prisma.user.findUnique({ where: { id: subAdminId } });
    if (!subAdmin || subAdmin.role !== "SUBADMIN") {
      return res.status(400).json({ error: "Invalid sub-admin ID" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Determine SLA deadline
    const config = await prisma.slaConfig.findUnique({ where: { department: complaint.category } });
    const daysToResolve = config ? config.daysToResolve : 7;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysToResolve);

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedAdminId: subAdminId,
        assignedAt: new Date(),
        slaDeadline: deadline,
        status: "ASSIGNED",
        slaBreached: false,
        slaBreach: "NONE"
      },
      include: {
        assignedAdmin: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unassign sub-admin
router.delete("/complaints/:id/assign", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedAdminId: null,
        assignedAt: null,
        slaDeadline: null,
        status: "OPEN",
        slaBreached: false,
        slaBreach: "NONE"
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SLA configs
router.get("/sla", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const configs = await prisma.slaConfig.findMany({
      include: { updatedBy: { select: { name: true } } },
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set SLA config
router.put("/sla/:department", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { daysToResolve } = req.body;
    const department = req.params.department;

    if (!daysToResolve || daysToResolve < 1) {
      return res.status(400).json({ error: "Invalid days to resolve" });
    }

    const config = await prisma.slaConfig.upsert({
      where: { department },
      update: {
        daysToResolve: parseInt(daysToResolve, 10),
        updatedById: req.userId,
      },
      create: {
        department,
        daysToResolve: parseInt(daysToResolve, 10),
        updatedById: req.userId,
      },
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
