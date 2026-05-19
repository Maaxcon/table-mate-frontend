export type GoogleFeedbackType = "success" | "error"

export type InitialGoogleFeedback = {
  code: string | null
  message: string
  type: GoogleFeedbackType
  cleanUrl: string | null
}
