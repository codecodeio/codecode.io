import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { Resend } from "resend";
const resend = new Resend(import.meta.env.RESEND_API_KEY);
const segmentIdGeneral = 'b196b0c9-b1d4-4ade-b89e-288c80d754b5';

export const server = {
  subscribe: defineAction({
    accept: 'form',
    input: z.object({
      email: z.string().email(),
    }),
    handler: async (input) => {     
      // Add contact to Resend 
      const { data: createData, error: createError } = await resend.contacts.create({
        email: input.email,
        unsubscribed: false,
      });     

      if (createError) {
        console.error('Resend contacts.create error:', createError);
        throw new ActionError({
          code: "BAD_REQUEST",
          message: createError.message,
        });
      }

      console.log('Resend contacts.create response data:', createData);

      //Add contact to segment
      const { data: segmentData, error: segmentError } = await resend.contacts.segments.add({
        email: input.email,
        segmentId: segmentIdGeneral,
      });

      if (segmentError) {
        console.error('Resend contact.segments.add error:', segmentError);
        throw new ActionError({
          code: "BAD_REQUEST",
          message: segmentError.message,
        });
      }

      console.log('Resend contact.segments.add response data:', segmentData);
      return segmentData;
    }
  })
}