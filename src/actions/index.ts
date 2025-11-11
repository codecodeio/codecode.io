import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { Resend } from "resend";
const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const server = {
  subscribe: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
    }),
    handler: async (input) => {      
      const { data, error } = await resend.contacts.create({
        email: input.email,
        unsubscribed: false,
      });     

      if (error) {
        console.error('Resend error:', error);
        throw new ActionError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }

      console.log('Resend response data:', data);
      return data;
    }
  })
}