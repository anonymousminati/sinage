import { Registration } from "../components/Registration";
import { useNavigate } from "react-router-dom";

export function RegisterPage() {
  const navigate = useNavigate();

  return <Registration onSwitchToLogin={() => navigate("/login")} />;
}