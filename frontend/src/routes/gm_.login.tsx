import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/components/estate/sign-in-form";

export const Route = createFileRoute("/gm_/login")({
  head: () => ({
    meta: [
      { title: "General Manager sign-in — EstateFlow" },
      { name: "description", content: "Sign in to the General Manager approvals desk." },
      { property: "og:title", content: "General Manager sign-in — EstateFlow" },
      { property: "og:description", content: "Approvals and escalations for the estate GM." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <SignInForm role="gm" />,
});
