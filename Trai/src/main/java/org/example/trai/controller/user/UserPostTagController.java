package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.VO.PostTagGetVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.service.PostTagService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user/post_tag")
public class UserPostTagController {
    @Resource
    private PostTagService postTagService;


    @GetMapping("/list")
    public Return<List<PostTagGetVO>> getPostTagList() {
        if (UserLoginInterceptor.current().getId() == null) return Return.fail(null, Codes.FAIL_NORMAL);

        List<PostTagGetVO> postTagGetVOList = postTagService.getPostTagList();
        return postTagGetVOList == null ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(postTagGetVOList, Codes.SUCCESS_NORMAL);
    }
}
