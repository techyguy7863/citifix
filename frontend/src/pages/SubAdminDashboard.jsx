import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subAdminApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Clock, MapPin, AlertTriangle, CheckCircle, ChevronDown, MessageSquare } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";

const SubAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((complaint) => {
            const isOverdue = new Date(complaint.slaDeadline) < new Date() && complaint.status !== "resolved";
            const daysRemaining = Math.ceil((new Date(complaint.slaDeadline) - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/5 backdrop-blur-md rounded-2xl border ${isOverdue ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/10'} overflow-hidden flex flex-col`}
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
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80">
                      #{complaint.id} • {complaint.category}
                    </span>
                    {!complaint.imageUrl && isOverdue && (
                      <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> OVERDUE
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2">{complaint.title}</h3>
                  <p className="text-white/60 text-sm mb-4 line-clamp-2">{complaint.description}</p>

                  <div className="space-y-2 mb-6 mt-auto">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{complaint.address || "Location provided"}</span>
                    </div>
                    {complaint.slaDeadline && (
                      <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-white/70'}`}>
                        <Clock className="w-4 h-4" />
                        <span>Deadline: {new Date(complaint.slaDeadline).toLocaleDateString()} ({isOverdue ? 'Overdue' : `${daysRemaining} days left`})</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/10">
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
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SubAdminDashboard;
