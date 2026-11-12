package org.example.trai.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.example.trai.entity.PO.ExamsPO;

import java.util.List;

@Mapper
public interface ExamsMapper {
    int insertOneExam(ExamsPO examsPO);

    List<ExamsPO> queryMeExams(Long userId);
}
