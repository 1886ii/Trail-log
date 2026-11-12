package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.DTO.ExamAddDTO;
import org.example.trai.entity.PO.ExamsPO;
import org.example.trai.entity.VO.ExamsGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.ExamsMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExamsService {
    @Resource
    private ExamsMapper examsMapper;

    public List<ExamsGetVO> getMeExams(Long userId) {
        List<ExamsPO> examsPOS = examsMapper.queryMeExams(userId);
        return examsPOS.stream()
                .map(po -> {
                    ExamsGetVO vo = new ExamsGetVO();
                    BeanUtils.copyProperties(po, vo);
                    return vo;
                })
                .toList();
    }

    public Boolean addExam(ExamAddDTO examAddDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return false;

        ExamsPO examsPO = new ExamsPO();
        BeanUtils.copyProperties(examAddDTO, examsPO);
        examsPO.setUserId(userId);

        return examsMapper.insertOneExam(examsPO) == 1;
    }
}
