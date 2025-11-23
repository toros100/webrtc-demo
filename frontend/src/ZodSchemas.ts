import { z } from 'zod';

const BaseSignalingMessageSchema = z.object({
    to: z.string(),
    from: z.string(),
    token: z.string(),
})
const OfferMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("offer"),
    content: z.string(),
    counter: z.int().nonnegative(),
})

const AnswerMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("answer"),
    content: z.string(),
    counter: z.int().nonnegative(),
})

const IceCandidateMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("ice-candidate"),
    content: z.string(),
    counter: z.int().nonnegative(),
})

const ReqMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("requesting")
})

const AckMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("acknowledging")
})

const SyncMessageSchema = BaseSignalingMessageSchema.extend({
    type: z.literal("synchronized"),
})

const version = {version: z.int().nonnegative()}
export const TokenNegotiationMessageSchema = z.discriminatedUnion("type", [
    ReqMessageSchema.extend(version),
    AckMessageSchema.extend(version),
    SyncMessageSchema.extend(version),
]);

export const RTCSignalingMessageSchema = z.discriminatedUnion("type", [
    OfferMessageSchema.extend(version),
    AnswerMessageSchema.extend(version),
    IceCandidateMessageSchema.extend(version),
]);

export const ExtRTCSignalingMessageSchema = z.discriminatedUnion("type", [
    TokenNegotiationMessageSchema,
    RTCSignalingMessageSchema
])

export const OutgoingExtRTCSignalingMessageSchema= z.discriminatedUnion("type", [
    ReqMessageSchema,
    AckMessageSchema,
    SyncMessageSchema,
    OfferMessageSchema,
    AnswerMessageSchema,
    IceCandidateMessageSchema,
])

export const TurnCredentialsSchema = z.object({
    username: z.string(),
    password: z.string()
})


export const EnvelopeSchema = z.object({
    kind: z.enum(["info", "signal"])
})


export const SignalUnwrapSchema = z.object({
    kind: z.literal("signal"),
    to: z.string().nonoptional(),
    from: z.string().nonoptional(),
    version: z.int().nonnegative().nonoptional(),
    payload: z.string().nonoptional()
}).transform((msg) => ({
    to: msg.to,
    from: msg.from,
    version: msg.version,
    ...JSON.parse(msg.payload),
})).pipe(ExtRTCSignalingMessageSchema)


export const InfoUnwrapSchema = z.object({
    kind: z.literal("info"),
    connected: z.record(z.string(), z.boolean()).nonoptional(),
}).omit({kind:true})


const OutgoingSignalEnvelopeSchema = z.object({
    kind: z.literal("signal"),
    to: z.string().nonoptional(),
    from: z.string().nonoptional(),
    payload: z.string().nonoptional(),
})


const InfoRequestSchema = z.object({
    kind: z.literal("requestInfo"),
})

export const OutgoingSchema = z.discriminatedUnion("kind", [
    OutgoingSignalEnvelopeSchema,
    InfoRequestSchema
])

export type InfoMessage = z.infer<typeof InfoUnwrapSchema>
export type OutgoingExtRTCSignalingMessage = z.infer<typeof OutgoingExtRTCSignalingMessageSchema>;
export type RTCSignalingMessage = z.infer<typeof RTCSignalingMessageSchema>;
export type ExtRTCSignalingMessage = z.infer<typeof ExtRTCSignalingMessageSchema>
export type TokenNegotiationMessage = z.infer<typeof TokenNegotiationMessageSchema>;
export type TurnCredentials = z.infer<typeof TurnCredentialsSchema>;