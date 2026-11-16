package org.example.trai.controller.admin;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.DTO.BookAddDTO;
import org.example.trai.entity.DTO.BookGetDTO;
import org.example.trai.entity.DTO.BookUpdateDTO;
import org.example.trai.entity.VO.BookListVO;
import org.example.trai.interceptor.AdminLoginInterceptor;
import org.example.trai.service.BookService;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/admin/book")
public class AdminBookController {
    @Resource
    private BookService bookService;

    @PostMapping("/add")
    public Return<Boolean> addBook(@RequestBody BookAddDTO bookAddDTO) {
        if (AdminLoginInterceptor.current().getId() == null
                || bookAddDTO == null || !StringUtils.hasLength(bookAddDTO.getBookName())
                || bookAddDTO.getBookTagId() == null || bookAddDTO.getBookTagId() <= 0
                || !StringUtils.hasLength(bookAddDTO.getUnitName())
                || !StringUtils.hasLength(bookAddDTO.getDescription())) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookService.addBook(bookAddDTO), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/list")
    public Return<List<BookListVO>> getList(@RequestBody BookGetDTO bookAdminGetDTO) {
        if (AdminLoginInterceptor.current().getId() == null
                || bookAdminGetDTO.getSize() == null || bookAdminGetDTO.getSize() <= 0
                || bookAdminGetDTO.getSize() > 50) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookService.getList(bookAdminGetDTO), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/cover")
    public Return<String> uploadBookCover(@RequestParam("file")MultipartFile file) {
        if (AdminLoginInterceptor.current().getId() == null || file.isEmpty()) return Return.fail(null, Codes.FAIL_NORMAL);

        String res = bookService.uploadBookCover(file);
        return res == null ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(res, Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/update")
    public Return<Boolean> updateBook(@RequestBody BookUpdateDTO bookUpdateDTO) {
        if (AdminLoginInterceptor.current().getId() == null || bookUpdateDTO.getId() == null || bookUpdateDTO.getId() <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        if (!StringUtils.hasLength(bookUpdateDTO.getAuthor()) && !StringUtils.hasLength(bookUpdateDTO.getBookName())
                && !StringUtils.hasLength(bookUpdateDTO.getCover()) && !StringUtils.hasLength(bookUpdateDTO.getDescription())
                && !StringUtils.hasLength(bookUpdateDTO.getUnitName()) && bookUpdateDTO.getBookTagId() == null && bookUpdateDTO.getGrade() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookService.updateBook(bookUpdateDTO), Codes.SUCCESS_NORMAL);
    }

    @PostMapping("/delete")
    public Return<Boolean> deleteBook(Long id) {
        if (AdminLoginInterceptor.current().getId() == null || id == null || id <= 0) return Return.fail(null, Codes.FAIL_NORMAL);

        return Return.success(bookService.deleteBook(id), Codes.SUCCESS_NORMAL);
    }
}
