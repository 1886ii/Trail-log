package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.VO.BookTagVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.BookTagService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user/book_tag")
public class UserBookTagController {

    @Resource
    private BookTagService bookTagService;


    @GetMapping("/book_tag")
    public Return<List<BookTagVO>> getBookTag() {
        if (UserLoginInterceptor.current().getId() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookTagService.getBookTag(), Codes.SUCCESS_NORMAL);
    }
}
