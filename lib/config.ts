export const config = {
  pinecone: {
    apiKey:
      process.env.PINECONE_API_KEY || "pcsk_5b3dG5_5ES47uEe1zCHSH2MFxu5vc2i27zCCco3jhVpDAFiULgqEZsVJaosUkCqb9ywvqQ",
    environment: "gcp-starter",
    indexName: "personal-erp",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4-turbo",
  },
}
