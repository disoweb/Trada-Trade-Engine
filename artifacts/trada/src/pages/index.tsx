import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setLocation("/dashboard");
      } else {
        setLocation("/login");
      }
    }
  }, [user, isLoading, setLocation]);

  return null;
}
