"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Search } from "lucide-react";
import AuthModal from "./AuthModal";
import { toast } from "sonner";
import { addProduct } from "@/app/actions";
import type { User } from "@supabase/supabase-js";

interface AddProductProps {
  user: User | null;
}

export default function AddProduct({ user }: AddProductProps) {
  const [url, setURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("url", url);

      const result = await addProduct(formData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message ?? "Product tracked successfully!");
        setURL("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch gap-3 px-4">
          {/* Input */}
          <div className="relative flex-1">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

            <Input
              type="url"
              value={url}
              onChange={(e) => setURL(e.target.value)}
              placeholder="Paste Product URL"
              className="h-12 pl-11 text-base focus-visible:ring-orange-500"
              required
              disabled={loading}
            />
          </div>

          {/* Button */}
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="h-12 px-8 bg-orange-500 hover:bg-orange-600 flex gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Track Price
              </>
            )}
          </Button>
        </div>
      </form>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
