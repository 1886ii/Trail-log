package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.BookGetDTO;
import org.example.trai.entity.DTO.UserReadChapterDTO;
import org.example.trai.entity.VO.BookListVO;
import org.example.trai.entity.VO.CurrentReadBookVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.BookService;
import org.example.trai.service.UserChapterReadService;
import org.example.trai.service.UserCurrentReadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user/book")
public class UserBookController {
    @Resource
    private BookService bookService;

    @Resource
    private UserCurrentReadService userCurrentReadService;

    @Resource
    private UserChapterReadService userChapterReadService;

    // 1. 分页分类获取书籍
    @PostMapping("/list")
    public Return<List<BookListVO>> getBooksByPageSizeAndTag(@RequestBody BookGetDTO bookGetDTO) {
        if (UserLoginInterceptor.current().getId() == null || bookGetDTO == null
                || bookGetDTO.getSize() == null || bookGetDTO.getSize() <= 0
                || bookGetDTO.getSize() > 50) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookService.getList(bookGetDTO), Codes.SUCCESS_NORMAL);
    }

     // 2. 查询当前阅读书籍
    @GetMapping("/current_read_book")
    public Return<CurrentReadBookVO> getCurrentReadBook() {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(userCurrentReadService.getCurrentReadBook(userId), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/change_current_read")
    public Return<Boolean> changeCurrentRead(Long bookId) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || bookId == null || bookId <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(userCurrentReadService.changeCurrentRead(bookId, userId), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/read_chapter")
    public Return<Boolean> readChapter(@RequestBody UserReadChapterDTO userReadChapterDTO) {
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null || userReadChapterDTO == null
                || userReadChapterDTO.getChapterId() == null || userReadChapterDTO.getChapterId() <= 0
                || userReadChapterDTO.getSortId() == null || userReadChapterDTO.getSortId() < 0
                || userReadChapterDTO.getBookId() == null || userReadChapterDTO.getBookId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);


        return Return.success(userChapterReadService.readChapter(userReadChapterDTO, userId), Codes.SUCCESS_NORMAL);
    }
}
