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
  };
};

// Get assigned complaints
router.get("/complaints", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { assignedAdminId: req.userId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [
        { slaDeadline: "asc" }, // Closest deadlines first
        { createdAt: "desc" }
      ],
    });

    res.json(complaints.map(c => toClientComplaint(c)));
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
