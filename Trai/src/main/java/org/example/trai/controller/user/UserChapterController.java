package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.ChapterGetDTO;
import org.example.trai.entity.VO.ChapterGetVO;
import org.example.trai.entity.VO.ChapterInfoVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.ChapterService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/chapter")
public class UserChapterController {
    @Resource
    private ChapterService chapterService;

    // 1. 分页获取章节信息  2. 获取详细章节信息
    @GetMapping("/get_info")
    public Return<ChapterInfoVO> getChapterById(Long id) {
        if (UserLoginInterceptor.current().getId() == null || id == null || id <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.getChapterById(id), Codes.SUCCESS_NORMAL);
    }


    @PostMapping("/list")
    public Return<List<ChapterGetVO>> getChaptersById(@RequestBody ChapterGetDTO chapterGetDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || chapterGetDTO == null
                || chapterGetDTO.getSize() == null || chapterGetDTO.getSize() <= 0 || chapterGetDTO.getSize() > 50
                || chapterGetDTO.getBookId() == null || chapterGetDTO.getBookId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.getChaptersByPageSizeAndBookId(chapterGetDTO, userId), Codes.SUCCESS_NORMAL);
    }
}
