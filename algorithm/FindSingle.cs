using System.Collections.Generic;
using System.Linq;

public class Algorithm
{
    public List<int> ThreeSingle(int[] nums)
    {
        var xor = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            xor ^= nums[i];
        }

        var firstOneBit = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            firstOneBit ^= GetFirstOneBit(xor ^ nums[i]);
        }
        firstOneBit = GetFirstOneBit(firstOneBit);

        var a = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            if ((firstOneBit & nums[i]) != 0)
                a ^= nums[i];
        }

        var l0 = new List<int>();
        l0.AddRange(nums.ToList());
        l0.Add(a);
        var l = TwoSingle(l0.ToArray());
        return new List<int>() { a, l[0], l[1] };
    }

    public List<int> TwoSingle(int[] nums)
    {
        var xor = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            xor = xor ^ nums[i];
        }

        var a = GetFirstOneBit(xor);

        var x1 = 0;
        var x2 = 0;
        for (int i = 0; i < nums.Length; i++)
        {
            if ((nums[i] & a) == 0)
            {
                x1 ^= nums[i];
            }
            else
            {
                x2 ^= nums[i];
            }
        }

        return new List<int> { x1, x2 };
    }

    public int GetFirstOneBit(int num)
    {
        var k = num;
        var a = 1;
        while (num % 2 == 0)
        {
            a++;
            num >>= 1;
        }
        return a;
    }
}