package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.trai.entity.PO.LikesPO;

import java.util.List;

@Mapper
public interface LikesMapper {
    int deleteByUserIdAndPostId(LikesPO likesPO);

    int insertToLike(LikesPO likesPO);

    LikesPO queryLike(LikesPO likesPO);

    List<Long> queryLikedPostIds(@Param("userId") Long userId, @Param("postIds") List<Long> postIds);

}
