export type GoogleFeedbackType = "success" | "error"

export type InitialGoogleFeedback = {
  message: string
  type: GoogleFeedbackType
  cleanUrl: string | null
}
