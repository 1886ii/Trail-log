package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.ExamAddDTO;
import org.example.trai.entity.VO.ExamsGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.ExamsService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/user/exams")
public class UserExamsController {
    @Resource
    private ExamsService examsService;

    @GetMapping("/list")
    public Return<List<ExamsGetVO>> getMeExams() {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return Return.fail(null, Codes.FAIL_NORMAL);
        List<ExamsGetVO> meExams = examsService.getMeExams(userId);
        return Return.success(meExams, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/add")
    public Return<Boolean> addExam(@RequestBody ExamAddDTO examAddDTO) {
        if (examAddDTO == null) return Return.fail(null, Codes.FAIL_NORMAL);
        if (!StringUtils.hasLength(examAddDTO.getExamName())
                ||!StringUtils.hasLength(examAddDTO.getExamScore())
                || examAddDTO.getExamTime() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        if (examAddDTO.getExamTime().isAfter(LocalDateTime.now())) return Return.fail(null, Codes.FAIL_TIME);

        return examsService.addExam(examAddDTO) ? Return.success(true, Codes.SUCCESS_NORMAL) : Return.fail(null, Codes.FAIL_NORMAL);
    }
}
