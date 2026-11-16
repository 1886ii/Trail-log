package org.example.trai.service;

import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.example.trai.entity.PO.MediaPO;
import org.example.trai.entity.VO.MediaUploadVO;
import org.example.trai.interceptor.UserLoginInterceptor;
import org.example.trai.mapper.MediaMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
public class MediaService {

    @Value("${trai.media.save_photo_path}")
    private String savePhotoPath;

    @Value("${trai.media.save_photo_size}")
    private Long savePhotoSize;

    @Resource
    private MediaMapper mediaMapper;

    public MediaUploadVO uploadMedia(MultipartFile multipartFile) {
        // 1. 登录校验
        Long userId = UserLoginInterceptor.current().getId();
        if (userId == null) {
            log.warn("上传图片：用户未登录");
            return null;
        }
        // 校验文件非空
        if (multipartFile.isEmpty()) {
            log.warn("上传图片：文件为空");
            return null;
        }

        // 2. 文件类型、大小校验
        String contentType = multipartFile.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("上传图片：不是图片类型，contentType={}", contentType);
            return null;
        }
        if (multipartFile.getSize() > savePhotoSize) {
            log.warn("上传图片：文件超出大小限制");
            return null;
        }

        String originalFilename = multipartFile.getOriginalFilename();
        String suffix = "";
        if (StringUtils.hasLength(originalFilename)) {
            int dotIndex = originalFilename.lastIndexOf(".");
            if (dotIndex != -1) {
                suffix = originalFilename.substring(dotIndex);
            }
        }
        String newFileName = UUID.randomUUID() + suffix;

        File rootDir = new File(savePhotoPath);
        if (!rootDir.exists()) {
            rootDir.mkdirs();
        }
        File targetFile = new File(rootDir, newFileName);

        // ========= 先保存文件到磁盘（不再消耗MultipartFile流多次） =========
        try {
            multipartFile.transferTo(targetFile);
            log.info("图片临时保存成功：{}", targetFile.getPath());
        } catch (IOException e) {
            log.error("图片写入磁盘失败", e);
            return null;
        }

        // ========= 从磁盘文件读取宽高，不会占用上传流 =========
        BufferedImage image;
        try {
            image = ImageIO.read(targetFile);
        } catch (IOException e) {
            log.error("读取图片宽高失败", e);
            // 读取失败，删掉已经存的脏文件
            if (targetFile.exists()) {
                targetFile.delete();
            }
            return null;
        }
        if (image == null) {
            log.warn("不是有效的图片文件");
            if (targetFile.exists()) {
                targetFile.delete();
            }
            return null;
        }
        int width = image.getWidth();
        int height = image.getHeight();

        // 3. 入库
        MediaPO mediaPO = new MediaPO();
        mediaPO.setUrl("/media/" + newFileName);
        mediaPO.setBytes((int) multipartFile.getSize());
        mediaPO.setOwnerId(userId);
        mediaPO.setWidth(width);
        mediaPO.setHeight(height);

        int res = mediaMapper.insertOneMedia(mediaPO);
        if (res != 1) {
            // 数据库插入失败，清理磁盘图片
            if (targetFile.exists()) {
                boolean del = targetFile.delete();
                log.warn("数据库插入失败，清理图片 {}，删除结果：{}", targetFile.getPath(), del);
            }
            return null;
        }

        log.info("图片入库成功，mediaId={} url={}", mediaPO.getId(), mediaPO.getUrl());
        return new MediaUploadVO(mediaPO.getId(), mediaPO.getUrl());
    }
}
