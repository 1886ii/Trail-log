package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.MediaPO;

@Mapper
public interface MediaMapper {
    int insertOneMedia(MediaPO mediaPO);
}
