import { Suspense } from "react";
import AuthExperience, { AuthLoadingState } from "../components/AuthExperience";

export default function LoginPage() {
  return <Suspense fallback={<AuthLoadingState />}><AuthExperience mode="login" /></Suspense>;
}
