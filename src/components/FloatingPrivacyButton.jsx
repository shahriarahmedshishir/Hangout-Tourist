import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function FloatingPrivacyButton() {
  const { user } = useAuth();

  // Show only for guests (user === null) or regular users (role === "user")
  const shouldShow = !user || user.role === "user";

  if (!shouldShow) return null;

  return (
    <Link
      to="/privacy-policy"
      className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center justify-center"
      title="Privacy Policy"
    >
      <Shield size={24} />
    </Link>
  );
}
