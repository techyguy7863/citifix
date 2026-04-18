import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subAdminApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, AlertTriangle, CheckCircle, ChevronDown, IndianRupee, ShieldCheck, CalendarClock, FileText, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";

const SubAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extensionModal, setExtensionModal] = useState({ isOpen: false, complaintId: null });
  const [extReason, setExtReason] = useState("");
  const [extDays, setExtDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const data = await subAdminApi.myComplaints();
      setComplaints(data);
    } catch (err) {
      toast({ title: "Error fetching assignments", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await subAdminApi.updateStatus(complaintId, newStatus);
      toast({ title: "Status updated" });
      fetchComplaints();
    } catch (err) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
  };

  const openExtensionModal = (complaintId) => {
    setExtReason("");
    setExtDays("");
    setExtensionModal({ isOpen: true, complaintId });
  };

  const handleSubmitExtension = async () => {
    if (!extReason.trim() || !extDays || parseInt(extDays) < 1) {
      toast({ title: "Please provide a reason and number of days (min 1)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await subAdminApi.requestExtension(extensionModal.complaintId, {
        reason: extReason.trim(),
        requestedDays: parseInt(extDays),
      });
      toast({ title: "Extension request submitted ✅", description: "Awaiting SuperAdmin approval." });
      setExtensionModal({ isOpen: false, complaintId: null });
      fetchComplaints();
    } catch (err) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Assignments</h1>
        <p className="text-white/60">Manage and resolve issues assigned to you.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">All Caught Up!</h3>
          <p className="text-white/60">You have no pending assignments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {complaints.map((complaint) => {
            const deadline = complaint.projectDeadline || complaint.slaDeadline;
            const isOverdue = deadline && new Date(deadline) < new Date() && complaint.status !== "resolved";
            const daysRemaining = deadline ? Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const latestExtRequest = complaint.extensionRequests?.[0];

            return (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/5 backdrop-blur-md rounded-2xl border ${isOverdue ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'border-white/10'} overflow-hidden flex flex-col`}
              >
                {complaint.imageUrl && (
                  <div className="h-48 overflow-hidden relative">
                    <img src={complaint.imageUrl} alt={complaint.title} className="w-full h-full object-cover" />
                    {isOverdue && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SLA BREACHED
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80">
                      #{complaint.id} · {complaint.category}
                    </span>
                    {!complaint.imageUrl && isOverdue && (
                      <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{complaint.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2">{complaint.description}</p>
                  </div>

                  {/* Project Details */}
                  {(complaint.projectAmount || complaint.warrantyPeriod || complaint.projectNote) && (
                    <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2">
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Project Details</p>
                      {complaint.projectAmount && (
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <IndianRupee className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Budget: <span className="text-amber-400 font-semibold">₹{complaint.projectAmount.toLocaleString()}</span></span>
                        </div>
                      )}
                      {complaint.warrantyPeriod && (
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span>Warranty: <span className="text-blue-400 font-semibold">{complaint.warrantyPeriod} days</span> after resolution</span>
                        </div>
                      )}
                      {complaint.projectNote && (
                        <div className="flex items-start gap-2 text-sm text-white/80">
                          <FileText className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="text-white/60 italic">{complaint.projectNote}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deadline & Location */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{complaint.address || "Location provided"}</span>
                    </div>
                    {deadline && (
                      <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-white/70'}`}>
                        <CalendarClock className="w-4 h-4" />
                        <span>
                          {complaint.projectDeadline ? "Project Deadline" : "SLA Deadline"}: {new Date(deadline).toLocaleDateString()} ({isOverdue ? 'Overdue' : `${daysRemaining}d left`})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Extension Request Status */}
                  {latestExtRequest && (
                    <div className={`rounded-xl border px-4 py-2 text-xs font-medium ${
                      latestExtRequest.status === "PENDING" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                      latestExtRequest.status === "APPROVED" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}>
                      Extension request: <span className="font-bold">{latestExtRequest.status}</span>
                      {latestExtRequest.status === "PENDING" && " — awaiting SuperAdmin review"}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/10 space-y-3 mt-auto">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Update Status</label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          value={complaint.status}
                          onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                          disabled={complaint.status === "resolved"}
                        >
                          <option value="assigned" className="bg-gray-900">🟡 IN PROGRESS</option>
                          <option value="resolved" className="bg-gray-900">🟢 RESOLVED</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 pointer-events-none" />
                      </div>
                    </div>

                    {complaint.status !== "resolved" && (!latestExtRequest || latestExtRequest.status === "REJECTED") && (
                      <button
                        onClick={() => openExtensionModal(complaint.id)}
                        className="w-full py-2.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" /> Request Time Extension
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Extension Request Modal */}
      <AnimatePresence>
        {extensionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white">Request Time Extension</h3>
                  <p className="text-white/40 text-sm">Your request will be reviewed by a SuperAdmin</p>
                </div>
                <button onClick={() => setExtensionModal({ isOpen: false, complaintId: null })} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Additional Days Needed</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 7"
                    value={extDays}
                    onChange={e => setExtDays(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Reason for Extension</label>
                  <textarea
                    rows={4}
                    placeholder="Explain why more time is needed..."
                    value={extReason}
                    onChange={e => setExtReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmitExtension}
                  disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SubAdminDashboard;
