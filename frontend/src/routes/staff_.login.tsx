import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/components/estate/sign-in-form";

export const Route = createFileRoute("/staff_/login")({
  head: () => ({
    meta: [
      { title: "Staff sign-in — EstateFlow" },
      { name: "description", content: "Sign in to the EstateFlow operations workspace." },
      { property: "og:title", content: "Staff sign-in — EstateFlow" },
      { property: "og:description", content: "Operations workspace for estate staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <SignInForm role="staff" />,
});
