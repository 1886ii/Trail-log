package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.example.trai.entity.DTO.PostGetDTO;
import org.example.trai.entity.PO.PostPO;

import java.util.List;

@Mapper
public interface PostMapper {
    int insertOne(PostPO postPO);
    int updateAddLikeCount(Long id);
    int updateSubtractLikeCount(Long id);
    int updateAddCommentCount(Long id);
    int updateSubtractCommentCount(Long id);
    List<PostPO> queryByPageSize(@Param("dto") PostGetDTO postGetDTO, @Param("userId") Long userId);
}
