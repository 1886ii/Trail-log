package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.CommentsPO;

import java.util.List;

@Mapper
public interface CommentsMapper {
    int insert(CommentsPO commentsPO);

    int updateReplyCountById(Long rootId);

    List<CommentsPO> queryByPostId(Long postId);
}
