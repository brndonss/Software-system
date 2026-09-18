import { Suspense } from "react";
import AuthExperience, { AuthLoadingState } from "../components/AuthExperience";

export default function SignupPage() {
  return <Suspense fallback={<AuthLoadingState />}><AuthExperience mode="signup" /></Suspense>;
}
