package org.example.trai.entity.VO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PostGetVO {
    // 用户信息
    private String avatar;
    private String nickname;
    // 记录信息
    private Long id;
    private Long postTagId;
    private String tagName;
    private String contentDelta;
    private String title;
    private String plainText;
    private Integer wordCount;
    private String cover;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    // 是否点赞
    private Boolean likeState;
}
