const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, subAdminMiddleware } = require("../middleware/auth");
const { buildHashtags } = require("../services/xEscalationService"); // Used for formatting

const router = express.Router();
const prisma = new PrismaClient();

const toClientComplaint = (complaint) => {
  return {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    location: {
      latitude: complaint.latitude,
      longitude: complaint.longitude,
    },
    latitude: complaint.latitude,
    longitude: complaint.longitude,
    address: complaint.address,
    image: complaint.imageUrl,
    imageUrl: complaint.imageUrl,
    status: complaint.status.toLowerCase(),
    votes: complaint.votes,
    anonymous: complaint.anonymous,
    assignedDepartment: complaint.assignedDepartment,
    assignedAdminId: complaint.assignedAdminId,
    assignedAt: complaint.assignedAt,
    slaDeadline: complaint.slaDeadline,
    slaBreached: complaint.slaBreached,
    hashtags: buildHashtags(complaint),
    userId: complaint.userId,
    userName: complaint.user?.name,
    user: complaint.user ? {
      id: complaint.user.id,
      name: complaint.user.name,
      phone: complaint.user.phone,
    } : null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    // Project details
    projectAmount: complaint.projectAmount,
    warrantyPeriod: complaint.warrantyPeriod,
    projectDeadline: complaint.projectDeadline,
    projectNote: complaint.projectNote,
    extensionRequests: complaint.extensionRequests || [],
  };
};

// Get assigned complaints
router.get("/complaints", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { assignedAdminId: req.userId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        extensionRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [
        { slaDeadline: "asc" },
        { createdAt: "desc" }
      ],
    });

    res.json(complaints.map(c => toClientComplaint(c)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request time extension for an assigned complaint
router.post("/complaints/:id/request-extension", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const { reason, requestedDays } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    if (!reason || !requestedDays || requestedDays < 1) {
      return res.status(400).json({ error: "Reason and requestedDays (min 1) are required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.assignedAdminId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check no pending request already exists
    const existing = await prisma.extensionRequest.findFirst({
      where: { complaintId, status: "PENDING" }
    });
    if (existing) return res.status(400).json({ error: "A pending extension request already exists" });

    const request = await prisma.extensionRequest.create({
      data: {
        complaintId,
        requestedById: req.userId,
        reason,
        requestedDays: parseInt(requestedDays, 10),
      }
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get extension requests for a complaint
router.get("/complaints/:id/extension-requests", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.assignedAdminId !== req.userId) return res.status(403).json({ error: "Not authorized" });

    const requests = await prisma.extensionRequest.findMany({
      where: { complaintId },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint status
router.patch("/complaints/:id/status", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const nextStatus = String(status).toUpperCase();

    const previous = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!previous) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (previous.assignedAdminId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this complaint" });
    }

    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: nextStatus,
        resolvedAt: nextStatus === "RESOLVED" ? new Date() : null,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (nextStatus === "RESOLVED" && previous.status !== "RESOLVED") {
      await prisma.user.update({
        where: { id: complaint.userId },
        data: {
          rewardPoints: {
            increment: 10,
          },
        },
      });
    }

    res.json(toClientComplaint(complaint));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
