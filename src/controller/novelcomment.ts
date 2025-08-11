import type { FastifyRequest, FastifyReply } from 'fastify'

const notImplemented = (action: string) => ({ success: false, message: `${action} for novel comment not implemented yet` })

export async function emitNovelCommentHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Emit'))
}
export async function getNovelCommentListHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('List'))
}
export async function emitNovelCommentUpvoteHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Upvote'))
}
export async function emitNovelCommentDownvoteHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Downvote'))
}
export async function cancelNovelCommentUpvoteHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Cancel upvote'))
}
export async function cancelNovelCommentDownvoteHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Cancel downvote'))
}
export async function deleteSelfNovelCommentHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Delete self'))
}
export async function adminDeleteNovelCommentHandler (req: FastifyRequest, rep: FastifyReply) {
  return rep.send(notImplemented('Admin delete'))
} 