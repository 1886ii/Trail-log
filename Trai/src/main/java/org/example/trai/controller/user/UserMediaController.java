package org.example.trai.controller.user;

import jakarta.annotation.Resource;
import org.example.trai.common.Return;
import org.example.trai.enmus.Codes;
import org.example.trai.entity.VO.MediaUploadVO;
import org.example.trai.service.MediaService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user/media")
public class UserMediaController {
    @Resource
    private MediaService mediaService;

    @PostMapping("/upload")
    public Return<MediaUploadVO> uploadMedia(@RequestParam("file")MultipartFile multipartFile) {
        if (multipartFile.isEmpty()) return Return.fail(null, Codes.FAIL_NORMAL);

        MediaUploadVO mediaUploadVO = mediaService.uploadMedia(multipartFile);
        return mediaUploadVO == null ? Return.fail(null, Codes.FAIL_NORMAL) : Return.success(mediaUploadVO, Codes.SUCCESS_NORMAL);
    }
}
