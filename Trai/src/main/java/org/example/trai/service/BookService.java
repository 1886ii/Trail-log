package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.DTO.BookAddDTO;
import org.example.trai.entity.DTO.BookGetDTO;
import org.example.trai.entity.DTO.BookUpdateDTO;
import org.example.trai.entity.PO.BookPO;
import org.example.trai.entity.PO.BookTagPO;
import org.example.trai.entity.VO.BookListVO;
import org.example.trai.mapper.BookMapper;
import org.example.trai.mapper.BookTagMapper;
import org.example.trai.mapper.ChapterMapper;
import org.example.trai.mapper.UserCurrentReadMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BookService {
    @Resource
    private BookMapper bookMapper;

    @Resource
    private BookTagMapper bookTagMapper;

    @Value("${trai.media.save_photo_path}")
    private String savePhotoPath;

    @Value("${trai.media.save_photo_size}")
    private Integer savePhotoSize;

    @Resource
    private UserCurrentReadMapper userCurrentReadMapper;

    @Resource
    private ChapterMapper chapterMapper;

    public Boolean addBook(BookAddDTO bookAddDTO) {
        BookPO po = new BookPO();
        BeanUtils.copyProperties(bookAddDTO, po);
        return bookMapper.insertOne(po) == 1;
    }

    public List<BookListVO> getList(BookGetDTO bookAdminGetDTO) {
        // 1. 获取数据
        List<BookPO> bookPOS = bookMapper.queryByPageSize(bookAdminGetDTO.getLastBookId(), bookAdminGetDTO.getSize(), bookAdminGetDTO.getBookTagId());
        if (bookPOS == null || bookPOS.isEmpty()) return Collections.emptyList();


        // 2. 查询tag组装
        List<BookTagPO> bookTagPOS = bookTagMapper.queryAll();
        Map<Long, String> tagNameMap = bookTagPOS.stream()
                .filter(tag -> tag.getId() != null && tag.getTagName() != null)
                .collect(Collectors.toMap(
                        BookTagPO::getId,
                        BookTagPO::getTagName,
                        (v1, v2) -> v1 // 重复key保留第一个
                ));

        // 3. 组装结果
        List<BookListVO> vos = new ArrayList<>();
        for (BookPO po : bookPOS) {
            BookListVO vo = new BookListVO();
            BeanUtils.copyProperties(po, vo);
            // 根据book_tag_id拿标签名，拿不到给空字符串
            String tagName = tagNameMap.getOrDefault(po.getBookTagId(), "");
            vo.setTagName(tagName);
            vos.add(vo);
        }

        return vos;
    }

    public String uploadBookCover(MultipartFile file) {
        // 1. 校验：非空 + 图片类型 + 大小（save_photo_size 单位是字节，与 media/avatar 同口径）
        if (file == null || file.isEmpty()) return null;
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) return null;
        if (file.getSize() > savePhotoSize) return null;

        // 2. 解码验证：读不出来就不是真图（顺带挡掉 HEIC）
        BufferedImage src;
        try (InputStream in = file.getInputStream()) {
            src = ImageIO.read(in);
        } catch (IOException e) {
            return null;
        }
        if (src == null) return null;

        // 3. 统一转 RGB + 白底：JPEG 不支持透明通道，带 alpha 的图直接 write 会静默返回 false（0 字节文件）
        int w = src.getWidth(), h = src.getHeight();
        int longSide = Math.max(w, h);
        int nw = w, nh = h;
        if (longSide > 1280) {
            double scale = 1280.0 / longSide;
            nw = Math.max(1, (int) Math.round(w * scale));
            nh = Math.max(1, (int) Math.round(h * scale));
        }
        BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(src, 0, 0, nw, nh, Color.WHITE, null);   // 透明区铺白底，封面场景比黑底合适
        g.dispose();

// 4. 落盘 {savePhotoPath}/book/cover/{uuid}.jpg → 返回 /media/book/cover/{uuid}.jpg
        String relPath = "book/cover/" + UUID.randomUUID() + ".jpg";
        Path target = Paths.get(savePhotoPath, "book", "cover",
                relPath.substring(relPath.lastIndexOf('/') + 1));
        try {
            Files.createDirectories(target.getParent());
            try (OutputStream os = Files.newOutputStream(target,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
                if (!ImageIO.write(out, "jpg", os)) {        // 防御：写失败删掉空文件，返回 null
                    Files.deleteIfExists(target);
                    return null;
                }
            }
        } catch (IOException e) {
            try {
                Files.deleteIfExists(target);                    // 半截文件也别留
            } catch (IOException ex) {
                throw new RuntimeException(ex);
            }
            return null;
        }
        return "/media/" + relPath;
        // todo:修改图书的时候先删除原图然后保存新图
    }

    public Boolean updateBook(BookUpdateDTO bookUpdateDTO) {
        BookPO po = new BookPO();
        BeanUtils.copyProperties(bookUpdateDTO, po);
        return bookMapper.update(po) == 1;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean deleteBook(Long id) {
        // 删除书籍后 同步删除当前在读书籍中的数据
        int delete = bookMapper.updateState(id);
        if (delete != 1) throw new RuntimeException("删除书籍失败");

        userCurrentReadMapper.updateState42ByBookId(id);
        chapterMapper.updateStateByBookId(id);
        return true;
    }
}
