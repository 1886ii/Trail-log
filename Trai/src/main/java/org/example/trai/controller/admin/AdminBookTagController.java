package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.BookTagAddDTO;
import org.example.trai.entity.VO.BookTagVO;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.BookTagService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/book_tag")
public class AdminBookTagController {
    @Resource
    private BookTagService bookTagService;

    @GetMapping("/book_tag")
    public Return<List<BookTagVO>> getBookTag() {
        if (AdminLoginInterceptor.current().getId() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookTagService.getBookTag(), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/add")
    public Return<Boolean> addBookTag(@RequestBody BookTagAddDTO bookTagAddDTO) {
        if (AdminLoginInterceptor.current().getId() == null
                || bookTagAddDTO == null || !StringUtils.hasLength(bookTagAddDTO.getTagName())) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookTagService.addBookTag(bookTagAddDTO), Codes.SUCCESS_NORMAL);
    }

}
