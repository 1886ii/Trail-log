package org.example.trai.service;

import jakarta.annotation.Resource;
import org.example.trai.entity.DTO.BookTagAddDTO;
import org.example.trai.entity.PO.BookTagPO;
import org.example.trai.entity.VO.BookTagVO;
import org.example.trai.entity.VO.ExamsGetVO;
import org.example.trai.mapper.BookTagMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookTagService {
    @Resource
    private BookTagMapper bookTagMapper;

    public List<BookTagVO> getBookTag() {
        List<BookTagPO> bookTagPOS = bookTagMapper.queryAll();
        return bookTagPOS.stream()
                .map(po -> {
                    BookTagVO vo = new BookTagVO();
                    BeanUtils.copyProperties(po, vo);
                    return vo;
                })
                .toList();
    }

    public Boolean addBookTag(BookTagAddDTO bookTagAddDTO) {
        BookTagPO po = new BookTagPO();
        BeanUtils.copyProperties(bookTagAddDTO, po);
        return bookTagMapper.insertOne(po) == 1;
    }
}
