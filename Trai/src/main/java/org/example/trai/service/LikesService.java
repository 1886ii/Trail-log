package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.LikesPO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.LikesMapper;
import org.example.trai.mapper.PostMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LikesService {

    @Resource
    private LikesMapper likesMapper;

    @Resource
    private PostMapper postMapper;

    public Boolean getLikeState(Long postId) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        LikesPO likesPO = new LikesPO();
        likesPO.setPostId(postId);
        likesPO.setUserId(userId);
        LikesPO isLike = likesMapper.queryLike(likesPO);

        return isLike != null;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelLike(Long postId) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        LikesPO likesPO = new LikesPO();
        likesPO.setPostId(postId);
        likesPO.setUserId(userId);

        if (likesMapper.deleteByUserIdAndPostId(likesPO) != 1) return false;  // 本来没点赞 → 无副作用
        if (postMapper.updateSubtractLikeCount(postId) != 1)                  // 已删除，计数失败 → 必须回滚
            throw new IllegalStateException("取消点赞计数更新失败");

        return false;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean enterLike(Long postId) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        LikesPO likesPO = new LikesPO();
        likesPO.setPostId(postId);
        likesPO.setUserId(userId);


        if (likesMapper.insertToLike(likesPO) != 1) return false;   // 没插进去 → 无副作用

        if (postMapper.updateAddLikeCount(postId) != 1)              // 已插入，计数失败 → 必须回滚
            throw new IllegalStateException("点赞计数更新失败");
        return true;

    }
}
