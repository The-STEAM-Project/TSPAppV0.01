"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LoginButton() {
  const router = useRouter();

  const login = () => {
    router.push("/auth/login");
  };

  return <Button onClick={login}>Admin Login</Button>;
}
