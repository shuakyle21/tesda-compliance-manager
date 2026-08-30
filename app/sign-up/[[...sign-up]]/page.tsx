import { redirect } from "next/navigation";

export default function SignUpPage() {
  redirect("/sign-in?sign_up=1");
}
