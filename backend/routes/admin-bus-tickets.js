const express = require("express");
const router = express.Router();
const { getDb } = require("../db");
const { ObjectId } = require("mongodb");
const { auth } = require("../middleware/auth");

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Middleware: Check admin role
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// GET /api/admin/bus-tickets — Fetch bus ticket applications
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const db = await getDb();

    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const tickets = await db
      .collection("busTicketRequests")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/bus-tickets/:ticketId — Get single ticket details
router.get("/:ticketId", auth, adminOnly, async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const db = await getDb();
    const ticket = await db
      .collection("busTicketRequests")
      .findOne({ _id: new ObjectId(ticketId) });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bus-tickets/:ticketId/approve — Approve ticket and create confirmed booking
router.post("/:ticketId/approve", auth, adminOnly, async (req, res) => {
  try {
    const { ticketId } = req.params;

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const db = await getDb();
    const session = db.client.startSession();

    try {
      await session.withTransaction(async () => {
        // Fetch ticket
        const ticket = await db
          .collection("busTicketRequests")
          .findOne({ _id: new ObjectId(ticketId) });

        if (!ticket) {
          throw new Error("Ticket not found");
        }

        if (ticket.status !== "pending") {
          throw new Error(
            `Cannot approve ticket with status: ${ticket.status}`,
          );
        }

        // Get bus details for confirmation
        const bus = await db
          .collection("buses")
          .findOne({ _id: new ObjectId(ticket.busId) });

        // Create confirmed booking in busBookings collection
        const busBooking = {
          type: "bus",
          userId: new ObjectId(ticket.userId),
          busId: new ObjectId(ticket.busId),
          busName: ticket.busName,
          departureTime: bus?.departureTime || "",
          travelDate: ticket.travelDate,
          seats: ticket.seats,
          pickupLocation: ticket.pickupLocation,
          contactNumber: ticket.contactNumber,
          totalAmount: ticket.totalAmount,
          status: "confirmed",
          paymentMethod: ticket.paymentMethod,
          transactionId: ticket.transactionId,
          screenshot: ticket.screenshot,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection("busBookings").insertOne(busBooking);

        // Update ticket status
        await db.collection("busTicketRequests").updateOne(
          { _id: new ObjectId(ticketId) },
          {
            $set: {
              status: "approved",
              updatedAt: new Date(),
            },
          },
        );
      });

      res.json({ message: "Ticket approved and booking confirmed" });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bus-tickets/:ticketId/reject — Reject ticket application
router.post("/:ticketId/reject", auth, adminOnly, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body; // Optional rejection reason

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket ID" });
    }

    const db = await getDb();

    // Update ticket status
    const result = await db.collection("busTicketRequests").updateOne(
      { _id: new ObjectId(ticketId) },
      {
        $set: {
          status: "rejected",
          rejectionReason: reason || "",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({ message: "Ticket rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
