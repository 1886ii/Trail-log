package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.VO.SubjectGetVO;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.service.SubjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/subject")
public class AdminSubjectController {
    @Resource
    private SubjectService subjectService;

    @GetMapping("/list")
    public Return<List<SubjectGetVO>> getSubjectList() {
        if (AdminLoginInterceptor.current().getId() == null) return Return.fail(null, Codes.FAIL_NORMAL);
        List<SubjectGetVO> subjectList = subjectService.getSubjectList();

        return subjectList.isEmpty() ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(subjectList, Codes.SUCCESS_NORMAL);
    }
}
