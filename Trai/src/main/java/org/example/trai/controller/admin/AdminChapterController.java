package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.ChapterAddDTO;
import org.example.trai.entity.DTO.ChapterDeleteDTO;
import org.example.trai.entity.DTO.ChapterUpdateDTO;
import org.example.trai.entity.VO.ChapterGetVO;
import org.example.trai.entity.VO.ChapterInfoVO;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.service.ChapterService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/chapter")
public class AdminChapterController {

    @Resource
    private ChapterService chapterService;

    @PostMapping("/add")
    public Return<Boolean> addChapter(@RequestBody ChapterAddDTO chapterAddDTO) {
        if (AdminLoginInterceptor.current().getId() == null
                || chapterAddDTO == null || chapterAddDTO.getBookId() == null || chapterAddDTO.getBookId() <= 0
                || !StringUtils.hasLength(chapterAddDTO.getTitle()) || !StringUtils.hasLength(chapterAddDTO.getDescription())
                || !StringUtils.hasLength(chapterAddDTO.getContent())) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.addChapter(chapterAddDTO), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/delete")
    public Return<Boolean> deleteChapter(@RequestBody ChapterDeleteDTO chapterDeleteDTO) {
        if (AdminLoginInterceptor.current().getId() == null || chapterDeleteDTO.getBookId() == null
                || chapterDeleteDTO.getBookId() <= 0 || chapterDeleteDTO.getChapterId() == null
                || chapterDeleteDTO.getChapterId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.deleteChapter(chapterDeleteDTO), Codes.SUCCESS_NORMAL);
    }

    @GetMapping("/list")
    public Return<List<ChapterGetVO>> getChaptersByBookId(Long bookId) {
        if (AdminLoginInterceptor.current().getId() == null || bookId == null || bookId <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.getChaptersByBookId(bookId), Codes.SUCCESS_NORMAL);
    }

    @GetMapping("/info")
    public Return<ChapterInfoVO> getChapterById(Long id) {
        if (AdminLoginInterceptor.current().getId() == null || id == null || id <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(chapterService.getChapterById(id), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/update")
    public Return<Boolean> updateChapter(@RequestBody ChapterUpdateDTO chapterUpdateDTO) {
        if (AdminLoginInterceptor.current().getId() == null || chapterUpdateDTO == null || chapterUpdateDTO.getId() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        if (chapterUpdateDTO.getChapterProblemId() == null && chapterUpdateDTO.getContent() == null && chapterUpdateDTO.getDescription() == null
                && chapterUpdateDTO.getTitle() == null) return Return.fail(false, Codes.FAIL_NORMAL);



        return Return.success(chapterService.updateChapter(chapterUpdateDTO), Codes.SUCCESS_NORMAL);

    }
}
