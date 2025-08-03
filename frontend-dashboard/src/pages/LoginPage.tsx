import { Login } from "../components/Login";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();

  return <Login onSwitchToRegister={() => navigate("/register")} />;
}