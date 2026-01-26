import { supabase } from "@js/supabase";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

const SITE_URL = "https://www.codecode.io";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async (input) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${SITE_URL}/confirm-subscription`,
        },
      });

      if (error) {
        console.error("Supabase signInWithOtp error:", error);
        throw new ActionError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }

      return { status: "pending" as const };
    },
  }),

  resendConfirmation: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async (input) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${SITE_URL}/confirm-subscription`,
        },
      });

      if (error) {
        console.error("Supabase signInWithOtp error:", error);
        throw new ActionError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }

      return { status: "sent" as const };
    },
  }),
};