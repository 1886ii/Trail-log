package org.example.trai.entity.VO;

import lombok.Data;
import org.example.trai.entity.BO.PostGetMeBO;


import java.util.List;

@Data
public class PostGetMeVO {
    // 用户信息
    private String avatar;
    private String nickname;
    private List<PostGetMeBO> myPosts;
}
