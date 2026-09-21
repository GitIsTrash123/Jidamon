# Jidamon RAG Policy

## Knowledge Access Rules

- Jidamon only uses information intentionally supplied to it.
- Jidamon does not automatically scrape or archive Discord message history.
- Regular members may use `/ask`.
- Only authorized server staff may add, remove, or clear guild knowledge.
- Authorized staff includes:
  - Server Owner
  - Administrator
  - Members with Manage Server permission
- Every knowledge item must belong to exactly one Discord guild.
- Retrieval must always be filtered by `guildId`.
- Knowledge from one guild must never be available to another guild.
- Deleting a document must also remove any derived chunks or embeddings.
- Stored knowledge is used for retrieval/context only, not for model training.
- Only the minimum relevant context should be sent to Gemini.
- Conversation memory, when added, must expire automatically.


## Storage Architecture

- Amazon S3 stores original guild-provided documents.
- DynamoDB stores guild configuration and document metadata.
- Document content is divided into smaller chunks for retrieval.
- Each stored chunk must include its associated `guildId`.
- Vector retrieval must always be restricted to the requesting guild.
- Only relevant retrieved chunks are provided to Gemini.
- Original Discord message history is not used as the guild knowledge base.
- Short-term conversation memory will be stored separately and will use automatic expiration.


## Vector Storage

- Jidamon uses MongoDB Atlas Vector Search for semantic knowledge retrieval.
- Original guild-provided documents remain stored in Amazon S3.
- MongoDB stores document chunks, embeddings, and retrieval metadata.
- Every knowledge chunk must contain a `guildId`.
- Vector searches must filter by the requesting Discord guild's `guildId`.
- Cross-guild knowledge retrieval is prohibited.
- DynamoDB remains responsible for guild configuration and short-term conversation memory.
- Only the most relevant authorized chunks are provided to Gemini.