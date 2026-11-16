package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CommentsGetVO {
    private Long id;
    private Long userId;
    private String avatar;
    private String nickname;
    private Long rootId;
    private Long replyId;
    private Long replyUserId;
    private String content;
    private Integer replyCount;
    private LocalDateTime createTime;
    private Boolean me;
}
