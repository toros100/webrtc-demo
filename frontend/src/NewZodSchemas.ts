import {z} from "zod";


const BaseSchema = z.object({
    to: z.string().nonoptional(),
    from: z.string().nonoptional(),
    token: z.string().nonoptional(),
    version: z.string().nonoptional(),
})


const ReqTokenSchema = BaseSchema.extend({
    type: z.literal("requesting")
})
const AckTokenSchema = BaseSchema.extend({
    type: z.literal("acknowledging")
})
const SynTokenSchema = BaseSchema.extend({
    type: z.literal("synchronized")
})

const TokenNegotiationSchema = z.discriminatedUnion("type", [
    ReqTokenSchema,
    AckTokenSchema,
    SynTokenSchema
])



const IceCandidateSchema = BaseSchema.extend({
    type: z.literal("ice-candidate"),
    candidate: z.string().nullable(),
})

const OfferSchema = BaseSchema.extend({
    type: z.literal("offer"),
    sdp: z.string().nonoptional()
})

const AnswerSchema = BaseSchema.extend({
    type: z.literal("answer"),
    sdp: z.string().nonoptional()
})


const RTCNegotiationSchema = z.discriminatedUnion("type", [
    IceCandidateSchema,
    OfferSchema,
    AnswerSchema,
])


const NegotiationMessageSchema = z.discriminatedUnion("type", [
    TokenNegotiationSchema,
    RTCNegotiationSchema,
])


const InfoMessageSchema = z.object({
    kind: z.literal("info"),
    connected: z.record(z.string(), z.string()).nonoptional(),
})

const IncomingSignalEnvelopeSchema = z.object({
    kind: z.literal("signal"),
    to: z.string().nonoptional(),
    from: z.string().nonoptional(),
    version: z.string().nonoptional(),
    payload: z.string().nonoptional()
})

export const IncomingWebSocketMessageSchema = z.discriminatedUnion("kind", [
    InfoMessageSchema,
    IncomingSignalEnvelopeSchema,
])


export const IncomingSignalSchema = IncomingSignalEnvelopeSchema
    .transform((msg) => ({
        to: msg.to,
        from: msg.from,
        version: msg.version,
        ...JSON.parse(msg.payload),
    })).pipe(NegotiationMessageSchema)


export type TokenNegotiationMessage = z.infer<typeof TokenNegotiationSchema>
export type RTCNegotiationMessage = z.infer<typeof RTCNegotiationSchema>
export type NegotiationMessage = z.infer<typeof NegotiationMessageSchema>

export type IncomingSignal = z.infer<typeof IncomingSignalSchema>
export type IncomingWebSocketMessage = z.infer<typeof IncomingWebSocketMessageSchema>
export type OutgoingWebSocketMessage = Omit<z.infer<typeof IncomingSignalEnvelopeSchema>, "version"> | {kind: "info"}
export type OutgoingSignal = Omit<IncomingSignal, "version">