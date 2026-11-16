package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class CommentDTO {
    private Long postId;  // 记录的id
    private Long rootId;  // 根评论的id 如果自己是根评论 则是-1
    private Long replyId; // 回复的那条评论的id 如果是根那么也是-1
    private Long replyUserId; // 回复的那条评论的用户的id 如果是根则是-1
    private String content;
}
