import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth/AuthProvider";
import { Loading } from "@/src/components/primitives";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/auth" />;
  return <Redirect href="/(tabs)/home" />;
}
