package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.PostTagPO;

import java.util.List;

@Mapper
public interface PostTagMapper {
    List<PostTagPO> queryAll();
}
