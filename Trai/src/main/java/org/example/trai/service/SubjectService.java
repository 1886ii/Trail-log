package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.PO.SubjectPO;
import org.example.trai.entity.VO.SubjectGetVO;
import org.example.trai.mapper.SubjectMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubjectService {
    @Resource
    private SubjectMapper subjectMapper;

    public List<SubjectGetVO> getSubjectList() {
        List<SubjectPO> subjectPOS = subjectMapper.queryAll();

        return subjectPOS.stream()
                .map(po -> {
                    SubjectGetVO vo = new SubjectGetVO();
                    BeanUtils.copyProperties(po, vo);
                    return vo;
                })
                .toList();
    }
}
